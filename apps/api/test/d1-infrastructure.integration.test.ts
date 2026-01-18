import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { GraphClient } from "@in-midst-my-life/core";
import { EmbeddingsService } from "@in-midst-my-life/core";
import { BillingService } from "@in-midst-my-life/core";

// Mock environment variables for testing
const NEO4J_URI = process.env["NEO4J_URI"] || "bolt://localhost:7687";
const NEO4J_USER = process.env["NEO4J_USER"] || "neo4j";
const NEO4J_PASSWORD = process.env["NEO4J_PASSWORD"] || "password";

describe("D1: Infrastructure Integration", () => {
  
  describe("Neo4j Integration", () => {
    // Skip if no Neo4j available (checking connection inside)
    it("connects to Neo4j and creates a node", async () => {
      const client = new GraphClient({
        uri: NEO4J_URI,
        user: NEO4J_USER,
        password: NEO4J_PASSWORD, // allow-secret - env var reference
      });

      const connected = await client.verifyConnection();
      if (!connected) {
        console.warn("Skipping Neo4j test - no connection");
        return;
      }

      try {
        // Create two nodes and an edge
        await client.runQuery("MERGE (p:TestProfile {id: 'test-p'})");
        await client.runQuery("MERGE (j:TestJob {id: 'test-j'})");
        
        const edge = await client.createContentEdge("test-p", "test-j", "TEST_APPLIED", {
          date: new Date().toISOString(),
        });

        expect(edge.records.length).toBe(1);
        expect(edge.records[0].get("r").type).toBe("TEST_APPLIED");

        // Cleanup
        await client.runQuery("MATCH (p:TestProfile {id: 'test-p'}) DETACH DELETE p");
        await client.runQuery("MATCH (j:TestJob {id: 'test-j'}) DETACH DELETE j");
      } finally {
        await client.close();
      }
    });
  });

  describe("Embeddings Service", () => {
    it("generates embeddings (mocked)", async () => {
      const service = new EmbeddingsService({ apiKey: "test-key" }); // allow-secret
      const embedding = await service.generateEmbedding("test text");

      // With test key, should return mock embeddings without calling OpenAI
      expect(embedding).toEqual([0.1, 0.2, 0.3]);

      // Test batch embeddings as well
      const embeddings = await service.generateEmbeddings(["text1", "text2"]);
      expect(embeddings).toEqual([
        [0.1, 0.2, 0.3],
        [0.1, 0.2, 0.3]
      ]);
    });
  });

  describe("Billing Service", () => {
    it("creates checkout session (mocked stripe)", async () => {
      const service = new BillingService({
        stripeSecretKey: "sk_test", // allow-secret (non-live key triggers mock mode)
        webhookSecret: "whsec_test", // allow-secret
        stripePriceIds: {
          FREE: { monthly: "free", yearly: "free" },
          PRO: { monthly: "price_pro_m", yearly: "price_pro_y" },
          ENTERPRISE: { monthly: "price_ent_m", yearly: "price_ent_y" }
        }
      });

      const session = await service.createCheckoutSession({
        profileId: "prof_123",
        priceId: "price_pro_m",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel"
      });

      // BillingService has built-in mock mode for test keys
      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toMatch(/^cs_test_/);
      expect(session.stripeCustomerId).toBeDefined();
      expect(session.stripeCustomerId).toMatch(/^cus_test_/);
      expect(session.url).toBeDefined();
      expect(session.url).toContain("https://checkout.stripe.com/pay/");
    });
  });
});
