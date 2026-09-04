import { seedLocalAuthUsers } from "../services/authService";
import { disconnectPrisma } from "../services/prisma";

seedLocalAuthUsers()
  .then((users) => {
    console.log("Seeded local auth accounts:");
    for (const user of users) console.log(`${user.role}: ${user.email}`);
  })
  .finally(() => disconnectPrisma());
