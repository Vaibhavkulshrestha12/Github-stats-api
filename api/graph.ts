import handler from "../src/api/graph.js";
import { createVercelHandler } from "../src/api/vercelAdapter.js";

export default createVercelHandler(handler);
