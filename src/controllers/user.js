const {sign} = require('jsonwebtoken')
const {hash, compare} = require('bcryptjs')

const {SECRET} = require('../config')

const registerUser = async (req, res, next) => {
  try {
    const {password, email} = req.body
    const [hashedPassword, hadUser] = await Promise.all([hash(password, 10), req.prisma.user.findOne({where: {email}})])

    if (hadUser && hadUser.email === email) {
      return res.status(400).json({message: `User with email ${email} exist`})
    }

    const user = await req.prisma.user.create({data: {...req.body, password: hashedPassword}})
    return res.status(201).json(user)
  } catch (err) {
    next(err)
  }
}

const getUsers = async (req, res, next) => {
  const {page, limit} = req.query
  try {
    const users = await req.prisma.user.findMany()
    return res.status(200).json(users)
  } catch (err) {
    next(err)
  }
}

const getUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)

    if (!id) {
      return res.status(400).json({message: 'Param resource not found'})
    }

    const user = await req.prisma.user.findOne({where: {id}})
    if (user) {
      return res.status(200).json(user)
    } else {
      return res.status(404).json({message: 'User not found'})
    }
  } catch (err) {
    next(err)
  }
}

const deleteUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)

    if (!id) {
      res.status(400).json({message: 'Param resource not found'})
    }

    const user = await req.prisma.user.delete({where: {id}})

    if (user) {
      return res.status(200).json(user)
    } else {
      return res.status(404).json({message: 'User not found'})
    }
  } catch (err) {
    next(err)
  }
}

const login = async (req, res, next) => {
  try {
    const {password, email} = req.body
    const user = await req.prisma.user.findOne({where: {email}})

    if (!user) {
      return res.status(400).json({message: `No such user found ${email}`})
    }

    const isValidPassword = await compare(password, user.password)

    if (!isValidPassword) {
      return res.status(400).json({message: 'Invalid password'})
    }

    const token = sign({userId: user.id}, SECRET, {expiresIn: '5m'})

    return res.status(200).json({token, user})
  } catch (err) {
    next(err)
  }
}

const userProfile = async (req, res, next) => {
  try {
    const id = parseInt(req.token.userId)

    const user = await req.prisma.user.findOne({where: {id}})

    if (user) {
      return res.status(200).json(user)
    } else {
      return res.status(404).json({message: 'User not found'})
    }
  } catch (err) {
    return next(err)
  }
}

module.exports = {
  registerUser,
  getUsers,
  getUser,
  deleteUser,
  login,
  userProfile
}