import { google } from "googleapis";

export type GoogleAuth = ReturnType<typeof getAuth>;

export const getAuth = () =>
  new google.auth.GoogleAuth({
    keyFile: "./credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
