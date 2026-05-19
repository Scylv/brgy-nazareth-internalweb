import { createApp } from "./app.js";
import { getPort } from "./config/env.js";
import { pool } from "./db/pool.js";

const app = createApp(pool);
const port = getPort();

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
