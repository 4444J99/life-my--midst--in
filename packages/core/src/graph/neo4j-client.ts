import neo4j, { Driver, Session, SessionConfig } from "neo4j-driver";

export interface GraphConfig {
  uri: string;
  user?: string;
  password?: string;
}

export class GraphClient {
  private driver: Driver;

  constructor(config: GraphConfig) {
    const auth =
      config.user && config.password
        ? neo4j.auth.basic(config.user, config.password)
        : undefined;

    this.driver = neo4j.driver(config.uri, auth);
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch (error) {
      console.error("Failed to connect to Neo4j:", error);
      return false;
    }
  }

  getSession(config?: SessionConfig): Session {
    return this.driver.session(config);
  }

  /**
   * Run a query and return the raw result
   */
  async runQuery(query: string, params: Record<string, any> = {}) {
    const session = this.getSession();
    try {
      return await session.run(query, params);
    } finally {
      await session.close();
    }
  }

  /**
   * Create a ContentEdge between two nodes
   * @param sourceId Source node ID (e.g. "Profile:123")
   * @param targetId Target node ID (e.g. "Job:456")
   * @param type Relationship type (e.g. "APPLIED_TO")
   * @param properties Edge properties
   */
  async createContentEdge(
    sourceId: string,
    targetId: string,
    type: string,
    properties: Record<string, any> = {}
  ) {
    const query = `
      MERGE (s { id: $sourceId })
      MERGE (t { id: $targetId })
      MERGE (s)-[r:${type}]->(t)
      SET r += $properties
      RETURN r
    `;

    return this.runQuery(query, { sourceId, targetId, properties });
  }
}
