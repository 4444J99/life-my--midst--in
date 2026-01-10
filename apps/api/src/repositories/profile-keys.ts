import { createHash, createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import * as jose from "jose";
import { DIDKey, type KeyPair } from "@in-midst-my-life/core";

type EncryptedPayload = {
  iv: string;
  tag: string;
  ciphertext: string;
};

export interface ProfileKeyRecord {
  id: string;
  profileId: string;
  did: string;
  publicKeyJwk: jose.JWK;
  privateKeyEnc: EncryptedPayload;
  createdAt: string;
}

export interface ProfileKeyRepo {
  create(profileId: string): Promise<ProfileKeyRecord>;
  get(profileId: string): Promise<ProfileKeyRecord | undefined>;
  getKeyPair(profileId: string): Promise<KeyPair | undefined>;
  reset(): Promise<void>;
}

export type ProfileKeyRepoKind = "memory" | "postgres";

export interface ProfileKeyRepoOptions {
  kind?: ProfileKeyRepoKind;
  pool?: Pool;
  connectionString?: string;
}

const keyMaterial = (() => {
  const raw = process.env["PROFILE_KEY_ENC_KEY"];
  if (!raw) {
    console.warn("PROFILE_KEY_ENC_KEY is not set; generating ephemeral key for encryption.");
  }
  const source = raw ?? randomBytes(32).toString("hex");
  return createHash("sha256").update(source).digest();
})();

const encryptPayload = (value: object): EncryptedPayload => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial, iv);
  const plaintext = Buffer.from(JSON.stringify(value));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
};

const decryptPayload = <T>(encrypted: EncryptedPayload): T => {
  const iv = Buffer.from(encrypted.iv, "base64");
  const tag = Buffer.from(encrypted.tag, "base64");
  const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
  const decipher = createDecipheriv("aes-256-gcm", keyMaterial, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf-8")) as T;
};

class InMemoryProfileKeyRepo implements ProfileKeyRepo {
  private data = new Map<string, ProfileKeyRecord>();

  async create(profileId: string) {
    const keyPair = await DIDKey.generate();
    const publicKeyJwk = await jose.exportJWK(keyPair.publicKey as any);
    const privateKeyJwk = await jose.exportJWK(keyPair.privateKey as any);
    const record: ProfileKeyRecord = {
      id: randomUUID(),
      profileId,
      did: keyPair.did,
      publicKeyJwk,
      privateKeyEnc: encryptPayload(privateKeyJwk),
      createdAt: new Date().toISOString()
    };
    this.data.set(profileId, record);
    return record;
  }

  async get(profileId: string) {
    return this.data.get(profileId);
  }

  async getKeyPair(profileId: string) {
    const record = await this.get(profileId);
    if (!record) return undefined;
    const privateKeyJwk = decryptPayload<jose.JWK>(record.privateKeyEnc);
    const publicKey = await jose.importJWK(record.publicKeyJwk, "EdDSA");
    const privateKey = await jose.importJWK(privateKeyJwk, "EdDSA");
    return { did: record.did, publicKey, privateKey };
  }

  async reset() {
    this.data.clear();
  }
}

class PostgresProfileKeyRepo implements ProfileKeyRepo {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ready = this.ensureTable();
  }

  private async ensureTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS profile_keys (
        id uuid PRIMARY KEY,
        profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        did text NOT NULL,
        public_key_jwk jsonb NOT NULL,
        private_key_enc jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async create(profileId: string) {
    await this.ready;
    const keyPair = await DIDKey.generate();
    const publicKeyJwk = await jose.exportJWK(keyPair.publicKey as any);
    const privateKeyJwk = await jose.exportJWK(keyPair.privateKey as any);
    const record: ProfileKeyRecord = {
      id: randomUUID(),
      profileId,
      did: keyPair.did,
      publicKeyJwk,
      privateKeyEnc: encryptPayload(privateKeyJwk),
      createdAt: new Date().toISOString()
    };
    await this.pool.query(
      `INSERT INTO profile_keys (id, profile_id, did, public_key_jwk, private_key_enc, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (profile_id) DO UPDATE SET
         did = EXCLUDED.did,
         public_key_jwk = EXCLUDED.public_key_jwk,
         private_key_enc = EXCLUDED.private_key_enc`,
      [record.id, profileId, record.did, record.publicKeyJwk, record.privateKeyEnc, record.createdAt]
    );
    return record;
  }

  async get(profileId: string) {
    await this.ready;
    const res = await this.pool.query(
      `SELECT id, profile_id, did, public_key_jwk, private_key_enc, created_at FROM profile_keys WHERE profile_id = $1`,
      [profileId]
    );
    const row = res.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      profileId: row.profile_id,
      did: row.did,
      publicKeyJwk: row.public_key_jwk,
      privateKeyEnc: row.private_key_enc,
      createdAt: row.created_at?.toISOString?.() ?? row.created_at
    } as ProfileKeyRecord;
  }

  async getKeyPair(profileId: string) {
    const record = await this.get(profileId);
    if (!record) return undefined;
    const privateKeyJwk = decryptPayload<jose.JWK>(record.privateKeyEnc);
    const publicKey = await jose.importJWK(record.publicKeyJwk, "EdDSA");
    const privateKey = await jose.importJWK(privateKeyJwk, "EdDSA");
    return { did: record.did, publicKey, privateKey };
  }

  async reset() {
    await this.ready;
    await this.pool.query(`TRUNCATE TABLE profile_keys`);
  }
}

export function createProfileKeyRepo(options: ProfileKeyRepoOptions = {}): ProfileKeyRepo {
  const hasPostgres = Boolean(options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]);
  const kind = options.kind ?? (process.env["PROFILE_KEY_STORE"] ?? (hasPostgres ? "postgres" : "memory"));
  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({
        connectionString: options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
      });
    return new PostgresProfileKeyRepo(pool);
  }
  return new InMemoryProfileKeyRepo();
}

export const profileKeyRepo: ProfileKeyRepo = createProfileKeyRepo();
