import { SPREADSHEET_ID } from "./constants.js";
import { getAuth } from "./auth.js";
import { Sheets } from "./Sheets.js";

const auth = getAuth();

const sheets = new Sheets(auth, SPREADSHEET_ID);
console.log("Connecting to your spreadsheet database...");
await sheets.insertInto("Dogs", { Name: "Johnny", Age: 25 });
// await sheets.insertInto("Users", { Name: "Johnny", Age: 25 });
console.log("Record added!");
// await sheets.deleteFrom("Users", { where: { Name: "Martijn" } });
// await sheets.deleteFrom("Dogs", { where: { Age: 10 } });
console.log("Record deleted!");
