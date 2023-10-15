import * as dotenv from "dotenv";
import express from "express";
import UserRouter from "./routers/user-router";
import AdminRouter from "./routers/admin-router";
import CompanyRouter from "./routers/company-router";
import JobPostRouter from "./routers/job-post-router";

class App {
  static instance: App;
  private express = express();

  private adminRoute: string = "/admin";
  private companyRoute: string = "/company";
  private jobPostRoute: string = "/job-post";
  private userRoute: string = "/user";

  private adminRouter: AdminRouter;
  private companyRouter: CompanyRouter;
  private jobPostRouter: JobPostRouter;
  private userRouter: UserRouter;

  private constructor() {
    this.express.use(express.json());

    this.adminRouter = new AdminRouter();
    this.express.use(this.adminRoute, this.adminRouter.router);

    this.companyRouter = new CompanyRouter();
    this.express.use(this.companyRoute, this.companyRouter.router);

    this.jobPostRouter = new JobPostRouter();
    this.express.use(this.jobPostRoute, this.jobPostRouter.router);

    this.userRouter = new UserRouter();
    this.express.use(this.userRoute, this.userRouter.router);

    this.express.listen(process.env.PORT);
    console.log(`Running in port ${process.env.PORT}.`);
  }

  static getInstance(): App {
    if (!App.instance) {
      App.instance = new App();
      console.log("New app instance has been created.");
    }
    return App.instance;
  }
}

dotenv.config();
const app = App.getInstance();

export default app;
