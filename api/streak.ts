import handler from "../src/api/streak.js";
import { createVercelHandler } from "../src/api/vercelAdapter.js";

export default createVercelHandler(handler);
