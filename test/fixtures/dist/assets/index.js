import { v } from "./vendor.js";
import "./shared.js";
const lazy = () => import("./lazy.js");
console.log(v, lazy);
