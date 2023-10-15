import { users } from "./user";
import { PrismaClient } from "@prisma/client";
import { userInformations } from "./user-information";
import { admins } from "./admin";
import HashService from "../services/hash-service";

const prisma = new PrismaClient();
const hashService: HashService = HashService.getInstance();

let main = async () => {
  // user
  console.log(`Adding ${users.length} users.`);
  for (let user of users) {
    await prisma.user.create({
      data: {
        id: user.id,
        username: user.username,
        password: await hashService.hashPassword(user.password, 10),
      },
    });
  }

  // user information
  console.log(`Adding ${userInformations.length} user informations.`);
  for (let userInformation of userInformations) {
    await prisma.userInformation.create({
      data: userInformation as any,
    });
  }

  // admin
  console.log(`Adding ${admins.length} admins.`);
  for (let admin of admins) {
    await prisma.admin.create({
      data: admin as any,
    });
  }
};

main()
  .catch((e) => {
    console.log(e);
    process.exit(1);
  })
  .finally(() => {
    console.log("seeding complete.");
    prisma.$disconnect();
  });
