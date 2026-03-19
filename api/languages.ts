import handler from "../src/api/languages.js";
import { createVercelHandler } from "../src/api/vercelAdapter.js";

export default createVercelHandler(handler);
