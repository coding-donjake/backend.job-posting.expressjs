import { Request, Response } from "express";
import { Router } from "express";
import PrismaService from "../services/prisma-service";
import AuthenticationService from "../services/authentication-service";
import HashService from "../services/hash-service";

class CompanyRouter {
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
    name: true,
    description: true,
    profileImage: true,
    profileCover: true,
    status: true,
    CompanyLog: {
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
    User: {
      select: {
        id: true,
        username: true,
        status: true,
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
  };

  private orderBy: object = [
    { name: "asc" },
    {
      User: {
        username: "asc",
      },
    },
    {
      User: {
        UserInformation: {
          lastName: "asc",
        },
      },
    },
    {
      User: {
        UserInformation: {
          firstName: "asc",
        },
      },
    },
    {
      User: {
        UserInformation: {
          middleName: "asc",
        },
      },
    },
  ];

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
    this.router.post(this.createRoute, async (req: Request, res: Response) => {
      req.body.user.password = await this.hashService.hashPassword(
        req.body.user.password,
        10
      );
      try {
        console.log(
          `Creating company using the following data: ${JSON.stringify(
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
            content: user,
          },
        });
        await this.prismaService.prisma.userInformationLog.create({
          data: {
            type: "create",
            userInformationId: userInformation.id,
            content: userInformation,
          },
        });
        req.body.company.userId = user.id;
        const company = await this.prismaService.prisma.company.create({
          data: req.body.company,
        });
        await this.prismaService.prisma.companyLog.create({
          data: {
            type: "create",
            companyId: company.id,
            content: company,
          },
        });
        console.log(
          `Company created: ${JSON.stringify({
            user,
            userInformation,
            company,
          })}`
        );
        res.status(200).json({ id: company.id });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          status: "server error",
          msg: error,
        });
      }
    });
  };

  private setGetRoute = async () => {
    this.router.post(
      this.getRoute,
      [this.authService.verifyToken, this.authService.verifyUser],
      async (req: Request, res: Response) => {
        try {
          let result = await this.prismaService.prisma.company.findMany({
            where: {
              OR: [{ status: "ok" }],
            },
            orderBy: this.orderBy,
            select: this.select,
          });
          if (!result) return res.status(400).send();
          console.log(
            `${result.length} companies sent to user ${req.body.decodedToken.id}.`
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
        console.log(`Login as company attempt using ${req.body.user.username}`);
        const { username, password } = req.body.user;
        const user = await this.authService.authenticateCompany(
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
          let result = await this.prismaService.prisma.company.findMany({
            where: {
              AND: [
                { OR: [{ status: "ok" }] },
                {
                  OR: [
                    { name: req.body.key },
                    { User: { username: req.body.key } },
                    {
                      User: {
                        UserInformation: {
                          lastName: req.body.key,
                        },
                      },
                    },
                    {
                      User: {
                        UserInformation: {
                          firstName: req.body.key,
                        },
                      },
                    },
                    {
                      User: {
                        UserInformation: {
                          middleName: req.body.key,
                        },
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
            `${result.length} companies sent to user ${req.body.decodedToken.id}.`
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
          let result = await this.prismaService.prisma.company.findFirst({
            where: {
              id: req.body.id,
            },
            orderBy: this.orderBy,
            select: this.select,
          });
          if (!result) return res.status(400).send();
          console.log(
            `company record has been sent to user ${req.body.decodedToken.id}.`
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
      [
        this.authService.verifyToken,
        this.authService.verifyUser,
        this.authService.verifyPassword,
      ],
      async (req: Request, res: Response) => {
        try {
          console.log(
            `Updating company ${
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
          let company = await this.prismaService.prisma.company.update({
            where: { userId: req.body.user.id },
            data: req.body.company,
          });
          if (!company) return res.status(400).send();
          await this.prismaService.prisma.companyLog.create({
            data: {
              type: "update",
              companyId: req.body.company.id,
              operatorId: req.body.decodedToken.id,
              content: req.body.company,
            },
          });
          console.log(`Company ${req.body.user.id} updated.`);
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

export default CompanyRouter;
