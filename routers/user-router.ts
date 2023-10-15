import { Request, Response } from "express";
import { Router } from "express";
import PrismaService from "../services/prisma-service";
import HashService from "../services/hash-service";
import AuthenticationService from "../services/authentication-service";

class UserRouter {
  public router: Router;
  private authService: AuthenticationService =
    AuthenticationService.getInstance();
  private hashService: HashService = HashService.getInstance();
  private prismaService: PrismaService = PrismaService.getInstance();

  private createRoute: string = "/create";
  private getRoute: string = "/get";
  private loginRoute: string = "/login";
  private searchRoute: string = "/search";
  private selectRoute: string = "/select";
  private updateRoute: string = "/update";

  private select: object = {
    id: true,
    username: true,
    status: true,
    UserLog: {
      orderBy: {
        datetime: "desc",
      },
      select: {
        id: true,
        datetime: true,
        type: true,
        content: true,
        Operator: {
          select: {
            id: true,
            username: true,
            UserInformation: {
              select: {
                id: true,
                lastName: true,
                firstName: true,
                middleName: true,
                suffix: true,
                gender: true,
                birthDate: true,
              },
            },
          },
        },
      },
    },
    UserInformation: {
      select: {
        id: true,
        lastName: true,
        firstName: true,
        middleName: true,
        suffix: true,
        gender: true,
        birthDate: true,
        UserInformationLog: {
          orderBy: {
            datetime: "desc",
          },
          select: {
            id: true,
            datetime: true,
            type: true,
            content: true,
            Operator: {
              select: {
                id: true,
                username: true,
                UserInformation: {
                  select: {
                    id: true,
                    lastName: true,
                    firstName: true,
                    middleName: true,
                    suffix: true,
                    gender: true,
                    birthDate: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    StudentInformation: {
      select: {
        schoolId: true,
        Course: {
          select: {
            name: true,
            status: true,
          },
        },
        Major: {
          select: {
            name: true,
            status: true,
          },
        },
      },
    },
  };

  private orderBy: object = {
    username: "asc",
    UserInformation: {
      lastName: "asc",
      firstName: "asc",
      middleName: "asc",
    },
  };

  constructor() {
    this.router = Router();
    this.setCreateRoute();
    this.setGetRoute();
    this.setLoginRoute();
    this.setSearchRoute();
    this.setSelectRoute();
    this.setUpdateRoute();
  }

  private setCreateRoute = async () => {
    this.router.post(
      this.createRoute,
      [this.authService.verifyToken, this.authService.verifyUser],
      async (req: Request, res: Response) => {
        req.body.user.password = await this.hashService.hashPassword(
          req.body.user.password,
          10
        );
        try {
          console.log(
            `Creating user using the following data: ${JSON.stringify(
              req.body
            )}`
          );
          if (req.body.user.username) {
            const checkUsernameExists =
              await this.prismaService.prisma.user.findFirst({
                where: {
                  username: req.body.user.username,
                },
              });
            if (checkUsernameExists) {
              console.log(
                `Username ${req.body.user.username} already been used.`
              );
              return res.status(409).send();
            }
          }
          const user = await this.prismaService.prisma.user.create({
            data: req.body.user,
          });
          await this.prismaService.prisma.userLog.create({
            data: {
              type: "create",
              userId: user.id,
              operatorId: req.body.decodedToken.id,
              content: user,
            },
          });
          req.body.userInformation.userId = user.id;
          const userInformation =
            await this.prismaService.prisma.userInformation.create({
              data: req.body.userInformation,
            });
          await this.prismaService.prisma.userInformationLog.create({
            data: {
              type: "create",
              userInformationId: userInformation.id,
              operatorId: req.body.decodedToken.id,
              content: userInformation,
            },
          });
          req.body.studentInformation.userId = user.id;
          const studentInformation =
            await this.prismaService.prisma.studentInformation.create({
              data: req.body.studentInformation,
            });
          await this.prismaService.prisma.studentInformationLog.create({
            data: {
              type: "create",
              studentInformationId: studentInformation.id,
              operatorId: req.body.decodedToken.id,
              content: studentInformation,
            },
          });
          console.log(
            `User created: ${JSON.stringify({ user, userInformation })}`
          );
          res.status(200).json({ id: user.id });
        } catch (error) {
          console.error(error);
          res.status(500).json({
            status: "server error",
            msg: error,
          });
        }
      }
    );
  };

  private setGetRoute = async () => {
    this.router.post(
      this.getRoute,
      [this.authService.verifyToken, this.authService.verifyUser],
      async (req: Request, res: Response) => {
        try {
          let result = await this.prismaService.prisma.user.findMany({
            where: {
              OR: [{ status: "ok" }, { status: "unverified" }],
            },
            orderBy: this.orderBy,
            select: this.select,
          });
          if (!result) return res.status(400).send();
          console.log(
            `${result.length} users sent to user ${req.body.decodedToken.id}.`
          );
          res.status(200).json({ data: result });
        } catch (error) {
          console.error(error);
          res.status(500).json({
            status: "server error",
            msg: error,
          });
        }
      }
    );
  };

  private setLoginRoute = async () => {
    this.router.post(this.loginRoute, async (req: Request, res: Response) => {
      try {
        console.log(`Login attempt using ${req.body.user.username}`);
        const { username, password } = req.body.user;
        const user = await this.authService.authenticateUser(
          username,
          password
        );
        if (!user) {
          console.log(`User ${username} login failed.`);
          res.status(401).send();
          return;
        }
        console.log(`User ${username} successfully logged in.`);
        res.status(200).json({
          accessToken: this.authService.generateAccessToken(
            user,
            process.env.TOKEN_DURATION!
          ),
          refreshToken: this.authService.generateRefreshToken(user),
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          status: "server error",
          msg: error,
        });
      }
    });
  };

  private setSearchRoute = async () => {
    this.router.post(
      this.searchRoute,
      [this.authService.verifyToken, this.authService.verifyUser],
      async (req: Request, res: Response) => {
        try {
          let result = await this.prismaService.prisma.user.findMany({
            where: {
              AND: [
                {
                  OR: [
                    { status: "ok" },
                    { status: "unverified" },
                    { status: "deactivated" },
                    { status: "suspended" },
                  ],
                },
                {
                  OR: [
                    { username: req.body.key },
                    {
                      UserInformation: {
                        lastName: req.body.key,
                      },
                    },
                    {
                      UserInformation: {
                        firstName: req.body.key,
                      },
                    },
                    {
                      UserInformation: {
                        middleName: req.body.key,
                      },
                    },
                  ],
                },
              ],
            },
            orderBy: this.orderBy,
            select: this.select,
          });
          if (!result) return res.status(400).send();
          console.log(
            `${result.length} users sent to user ${req.body.decodedToken.id}.`
          );
          res.status(200).json({ data: result });
        } catch (error) {
          console.error(error);
          res.status(500).json({
            status: "server error",
            msg: error,
          });
        }
      }
    );
  };

  private setSelectRoute = async () => {
    this.router.post(
      this.selectRoute,
      [this.authService.verifyToken, this.authService.verifyUser],
      async (req: Request, res: Response) => {
        try {
          let result = await this.prismaService.prisma.user.findFirst({
            where: {
              id: req.body.id,
            },
            select: this.select,
          });
          if (!result) return res.status(400).send();
          console.log(
            `user record has been sent to user ${req.body.decodedToken.id}.`
          );
          res.status(200).json({ data: result });
        } catch (error) {
          console.error(error);
          res.status(500).json({
            status: "server error",
            msg: error,
          });
        }
      }
    );
  };

  private setUpdateRoute = async () => {
    this.router.post(
      this.updateRoute,
      [this.authService.verifyToken, this.authService.verifyUser],
      async (req: Request, res: Response) => {
        try {
          console.log(
            `Updating user ${
              req.body.user.id
            } using the following data: ${JSON.stringify(req.body)}`
          );
          if (req.body.user.password) {
            req.body.user.password = await this.hashService.hashPassword(
              req.body.user.password,
              10
            );
          }
          let user = await this.prismaService.prisma.user.update({
            where: { id: req.body.user.id },
            data: req.body.user,
          });
          if (!user) return res.status(400).send();
          await this.prismaService.prisma.userLog.create({
            data: {
              type: "update",
              userId: req.body.user.id,
              operatorId: req.body.decodedToken.id,
              content: req.body.user,
            },
          });
          let userInformation =
            await this.prismaService.prisma.userInformation.update({
              where: { userId: req.body.user.id },
              data: req.body.userInformation,
            });
          if (!userInformation) return res.status(400).send();
          await this.prismaService.prisma.userInformationLog.create({
            data: {
              type: "update",
              userInformationId: req.body.userInformation.id,
              operatorId: req.body.decodedToken.id,
              content: req.body.userInformation,
            },
          });
          console.log(`User ${req.body.user.id} updated.`);
          res.status(200).send();
        } catch (error) {
          console.error(error);
          res.status(500).json({
            status: "server error",
            msg: error,
          });
        }
      }
    );
  };
}

export default UserRouter;
