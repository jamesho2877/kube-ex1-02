import pg from "pg";

const {
  NS,
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
} = process.env;

export default class Database {
  #pool;

  constructor() {
    this.#pool = new pg.Pool({
      host: `postgres-svc.${NS}.svc.cluster.local`,
      port: 5432,
      database: POSTGRES_DB,
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      max: 10,
    });

    this.#pool.on("error", async (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  async readTodos() {
    let data;
    try {
      const rs = await this.#pool.query("SELECT * FROM todos");
      data = rs.rows.reduce((acc, row) => {
        const content = row.content || "";
        return content ? acc.concat(content) : acc;
      }, []);
    } catch (err) {
      console.error(err);
    } finally {
      return data;
    }
  }
  
  async writeTodo(todo) {
    if (!todo) return;
    const rs = await this.#pool.query({
      text: "INSERT INTO todos (content) VALUES ($1) RETURNING *",
      values: [todo],
    });
    return rs.rows[0]?.content || "";
  }
}