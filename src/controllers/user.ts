import HttpStatus from "http-status-codes";
import {Request, Response, NextFunction} from "express";
import {sign} from "jsonwebtoken";

import db from "../database/models";
import {SECRET} from "../config";
import {IRequest} from "../interfaces";
import {hashPassword, comparePasswords, logger, errorMessage} from "../libs";

async function createUser(request: Request, response: Response, next: NextFunction): Promise<Response | void> {
  try {
    const user = request.body;

    if (!Object.keys(user).length) {
      throw errorMessage(HttpStatus.NO_CONTENT, undefined, HttpStatus.getStatusText(HttpStatus.NO_CONTENT));
    }

    logger.debug("params to create user: ", user);

    const userEmailExist = await db.User.findOne({email: user.email});
    if (userEmailExist) {
      throw errorMessage(
        HttpStatus.CONFLICT,
        `Email ${user.email} already exist!`,
        HttpStatus.getStatusText(HttpStatus.CONFLICT)
      );
    }

    const hashedPassword = await hashPassword(user.password);
    const users = await db.User.create({...user, password: hashedPassword});
    return response.status(201).send({result: users});
  } catch (err) {
    return next(err);
  }
}

async function getUsers(request: Request, response: Response, next: NextFunction): Promise<Response | void> {
  try {
    const limit = Number(request.query.limit) || 2;
    const offset = Number(request.query.offset) || 0;
    const users = await db.User.findAll({limit, offset});
    return response.status(200).send({result: {users, limit, offset}});
  } catch (err) {
    return next(err);
  }
}

async function updateUser(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const userId = Number(req.params.userId);

    if (!userId) {
      throw errorMessage(
        HttpStatus.BAD_REQUEST,
        `Param resource not found`,
        HttpStatus.getStatusText(HttpStatus.BAD_REQUEST)
      );
    }

    const query = {
      where: {id: userId},
      returning: true
    };

    const user = await db.User.update(query, req.body);

    if (user) {
      return res.status(200).send({result: {user}});
    } else {
      throw errorMessage(
        HttpStatus.NOT_FOUND,
        `User ${req.body.name} not found`,
        HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
      );
    }
  } catch (err) {
    return next(err);
  }
}

async function login(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    logger.debug("login user: ", req.body.email);

    const {password, email} = req.body;
    const user = await db.User.findOne({where: {email}});
    if (!user) {
      throw errorMessage(
        HttpStatus.NOT_FOUND,
        `No such user found ${email}`,
        HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
      );
    }
    const isValidPassword = await comparePasswords(password, user.password);
    if (!isValidPassword) {
      throw errorMessage(
        HttpStatus.BAD_REQUEST,
        "Invalid password",
        HttpStatus.getStatusText(HttpStatus.BAD_REQUEST)
      );
    }

    const token = sign({userId: user.uuid}, SECRET, {expiresIn: "1h"});
    return res.status(200).send({
      result: {
        token,
        user
      }
    });
  } catch (err) {
    console.log("@ error", err);
    return next(err);
  }
}

async function getProfile(req: IRequest, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    logger.debug("get user profile by: ", req.locals.user);
    return res.status(200).send({result: req.locals.user});
  } catch (err) {
    return next(err);
  }
}

export {createUser, getUsers, login, updateUser, getProfile};
