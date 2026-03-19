import handler from "../src/api/stats.js";
import { createVercelHandler } from "../src/api/vercelAdapter.js";

export default createVercelHandler(handler);
