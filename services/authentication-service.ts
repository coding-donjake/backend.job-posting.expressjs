import express, { Request, Response } from "express";
import PrismaService from "./prisma-service";
import HashService from "./hash-service";
import jwt from "jsonwebtoken";

class AuthenticationService {
  static instance: AuthenticationService;

  private hashService: HashService = HashService.getInstance();
  private prismaService: PrismaService = PrismaService.getInstance();

  static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
      console.log("New authentication service instance has been created.");
    }
    return AuthenticationService.instance;
  }

  public authenticateAdmin = async (username: string, password: string) => {
    try {
      const admin = await this.prismaService.prisma.user.findFirst({
        where: {
          AND: [
            { username: username },
            {
              Admin: {
                status: "ok",
              },
            },
          ],
        },
      });
      if (!admin) return false;
      const passwordMatches = await this.hashService.comparePasswords(
        password,
        admin.password!
      );
      if (!passwordMatches) return false;
      return admin;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  public authenticateCompany = async (username: string, password: string) => {
    try {
      const company = await this.prismaService.prisma.user.findFirst({
        where: {
          AND: [
            { username: username },
            {
              Company: {
                status: "ok",
              },
            },
          ],
        },
        select: {
          id: true,
          username: true,
          password: true,
          status: true,
          Company: {
            select: {
              id: true,
            },
          },
        },
      });
      if (!company) return false;
      const passwordMatches = await this.hashService.comparePasswords(
        password,
        company.password!
      );
      if (!passwordMatches) return false;
      return company;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  public authenticateUser = async (username: string, password: string) => {
    try {
      const user = await this.prismaService.prisma.user.findFirst({
        where: { username: username },
      });
      if (!user) return false;
      const passwordMatches = await this.hashService.comparePasswords(
        password,
        user.password!
      );
      if (!passwordMatches) return false;
      return user;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  public generateAccessToken = (content: object, expiration: string) => {
    const token: string = jwt.sign(content, process.env.SECRET_KEY!, {
      expiresIn: expiration,
    });
    return token;
  };

  public generateRefreshToken = (content: object) => {
    const token: string = jwt.sign(content, process.env.SECRET_KEY!);
    return token;
  };

  public verifyAdmin = async (req: Request, res: Response, next: any) => {
    try {
      const admin = await this.prismaService.prisma.admin.findUnique({
        where: { userId: req.body.decodedToken.id },
      });
      if (!admin || admin.status !== "ok") {
        console.log("Unauthorized admin access attempt.");
        return res.status(401).send();
      }
      next();
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  public verifyCompany = async (req: Request, res: Response, next: any) => {
    try {
      const admin = await this.prismaService.prisma.company.findUnique({
        where: { userId: req.body.decodedToken.id },
      });
      if (!admin || admin.status !== "ok") {
        console.log("Unauthorized company access attempt.");
        return res.status(401).send();
      }
      next();
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  public verifyPassword = async (req: Request, res: Response, next: any) => {
    try {
      const user = await this.prismaService.prisma.user.findUnique({
        where: { id: req.body.decodedToken.id },
      });
      if (!user) {
        console.log("Unauthorized user access attempt.");
        return res.status(401).send();
      }
      const verify = await this.authenticateUser(
        req.body.decodedToken.username,
        req.body.password
      );
      if (!verify) {
        console.log("Invalid confirmation password.");
        return res.status(401).send();
      }
      next();
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  public verifyToken = (req: Request, res: Response, next: any) => {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided." });
    jwt.verify(token, process.env.SECRET_KEY!, (err, decoded) => {
      if (err)
        return res
          .status(403)
          .json({ message: "Failed to authenticate token." });
      req.body.decodedToken = decoded;
      next();
    });
  };

  public verifyUser = async (req: Request, res: Response, next: any) => {
    try {
      const user = await this.prismaService.prisma.user.findUnique({
        where: { id: req.body.decodedToken.id },
      });
      if (!user || (user.status !== "ok" && user.status !== "unverified")) {
        console.log("Unauthorized user access attempt.");
        return res.status(401).send();
      }
      next();
    } catch (error) {
      console.error(error);
      return false;
    }
  };
}

export default AuthenticationService;
