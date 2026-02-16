import dotenv from "dotenv";
import { createApp } from "./app";
import { assertJwtConfiguration } from "./utils/jwt";

dotenv.config();
assertJwtConfiguration();

const PORT = Number(process.env.PORT || 4000);
const app = createApp();

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
