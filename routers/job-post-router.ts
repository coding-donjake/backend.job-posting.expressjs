import { Request, Response } from "express";
import { Router } from "express";
import PrismaService from "../services/prisma-service";
import AuthenticationService from "../services/authentication-service";
import HashService from "../services/hash-service";
import { title } from "process";

class JobPostRouter {
  public router: Router;
  private authService: AuthenticationService =
    AuthenticationService.getInstance();
  private hashService: HashService = HashService.getInstance();
  private prismaService: PrismaService = PrismaService.getInstance();

  private createRoute: string = "/create";
  private getRoute: string = "/get";
  private searchRoute: string = "/search";
  private selectRoute: string = "/select";
  private updateRoute: string = "/update";

  private select: object = {
    id: true,
    title: true,
    description: true,
    slots: true,
    status: true,
    JobPostLog: {
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
    Application: {
      select: {
        id: true,
        status: true,
        User: {
          select: {
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
            StudentInformation: {
              select: {
                id: true,
                schoolId: true,
                Course: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  },
                },
                Major: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  private orderBy: object = [{ title: "asc" }];

  constructor() {
    this.router = Router();
    this.setCreateRoute();
    this.setGetRoute();
    this.setSearchRoute();
    this.setSelectRoute();
    this.setUpdateRoute();
  }

  private setCreateRoute = async () => {
    this.router.post(
      this.createRoute,
      [
        this.authService.verifyToken,
        this.authService.verifyUser,
        this.authService.verifyCompany,
        this.authService.verifyPassword,
      ],
      async (req: Request, res: Response) => {
        try {
          console.log(
            `Creating jobPost using the following data: ${JSON.stringify(
              req.body
            )}`
          );
          console.log(req.body.decodedToken);
          req.body.jobPost.companyId = req.body.decodedToken.Company.id;
          const jobPost = await this.prismaService.prisma.jobPost.create({
            data: req.body.jobPost,
          });
          await this.prismaService.prisma.jobPostLog.create({
            data: {
              type: "create",
              jobPostId: jobPost.id,
              operatorId: req.body.decodedToken.id,
              content: jobPost,
            },
          });
          console.log(`Job Post created: ${JSON.stringify(jobPost)}`);
          res.status(200).json({ id: jobPost.id });
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
          let result = await this.prismaService.prisma.jobPost.findMany({
            where: {
              OR: [{ status: "ok" }],
            },
            orderBy: this.orderBy,
            select: this.select,
          });
          if (!result) return res.status(400).send();
          console.log(
            `${result.length} jobPosts sent to user ${req.body.decodedToken.id}.`
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

  private setSearchRoute = async () => {
    this.router.post(
      this.searchRoute,
      [this.authService.verifyToken, this.authService.verifyUser],
      async (req: Request, res: Response) => {
        try {
          let result = await this.prismaService.prisma.jobPost.findMany({
            where: {
              AND: [
                { OR: [{ status: "ok" }] },
                {
                  OR: [{ title: req.body.key }],
                },
              ],
            },
            orderBy: this.orderBy,
            select: this.select,
          });
          if (!result) return res.status(400).send();
          console.log(
            `${result.length} jobPosts sent to user ${req.body.decodedToken.id}.`
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
          let result = await this.prismaService.prisma.jobPost.findFirst({
            where: {
              id: req.body.id,
            },
            orderBy: this.orderBy,
            select: this.select,
          });
          if (!result) return res.status(400).send();
          console.log(
            `jobPost record has been sent to user ${req.body.decodedToken.id}.`
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
        this.authService.verifyCompany,
        this.authService.verifyPassword,
      ],
      async (req: Request, res: Response) => {
        try {
          console.log(
            `Updating jobPost ${
              req.body.jobPost.id
            } using the following data: ${JSON.stringify(req.body)}`
          );
          let jobPost = await this.prismaService.prisma.jobPost.update({
            where: { id: req.body.jobPost.id },
            data: req.body.jobPost,
          });
          if (!jobPost) return res.status(400).send();
          await this.prismaService.prisma.jobPostLog.create({
            data: {
              type: "update",
              jobPostId: req.body.jobPost.id,
              operatorId: req.body.decodedToken.id,
              content: req.body.jobPost,
            },
          });
          console.log(`Job Post ${req.body.jobPost.id} updated.`);
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

export default JobPostRouter;
