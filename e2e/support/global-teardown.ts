import { deleteE2EData } from "./admin";

export default async function globalTeardown() {
  await deleteE2EData();
}
