# One Sobha - User Service

# Contents
- [About](#about)
- [Build With](#build-With)
- [Features](#features)
- [Get Started](#get-started)
- [Dependancies](#pre-application-dependencies)
- [Modules](#modules)

## About
User API Services offer seamless integration for managing user authentication and access controls to the service and functionalities

## Build With

* [![Node]][Node.js](https://nodejs.org/en/blog/release/v16.15.1)
* [![Express]][Express.js](https://github.com/expressjs/express/blob/master/History.md#4182--2022-10-08)
* [![MySQL]][MySQL 8.0](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/)
* [![TypeORM]][Type ORM 0.3.15](https://github.com/typeorm/typeorm/releases/tag/0.3.15)

## Features

- User Registration
- User Authentication
- Token validation
- Modify Access token and sessions against refresh token
- User session validation

## Get Started

### Cloning repository with sub modules

```sh
git clone --recurse-submodules <Repository_URL>
```

### Pull submodules after cloning
```sh
git submodule update --init --recursive
```

### Installation

#### yarn

```sh
yarn install
```

#### npm

```sh
npm install
```

#### Running application

For development environment...
Using YARN:

```sh
yarn dev
```

Using NPM:

```sh
npm run dev
```

For production environment...
Using YARN:

```sh
yarn start
```

Using NPM:

```sh
npm start
```

## Pre Application Dependencies

- .env
- node_modules
- dependency lock file
- ![NPM VERSION: 9.5.1](https://img.shields.io/badge/npm-9.5.1-yellow.svg)
- ![NODE VERSION: 18.16.0](https://img.shields.io/badge/node-18.16.0-yellow.svg)
- submodules
- - [Basic Utilities, Constants, Configurations](https://github.com/Sobha-Realty/Common-Constants?tab=readme-ov-file#Utility-Functions)
- - [Database Schemas](https://github.com/Sobha-Realty/Database-Entities?tab=readme-ov-file#Service-Entities)

## Modules
- [Admin Access](src/Modules/AdminAccess/ADMIN_ACCESS.md)
- [Admin Users](src/Modules/AdminUsers/ADMIN_USERS.md)
- [Authentication](src/Modules/Authentication/AUTHENTICATION.md)
- [Payments](src/Modules/Payments/PAYMENT.md)
- [Permission](src/Modules/Permission/PERMISSIONS.md)
- [Restriction](src/Modules/Restriction/RESTRICTIONS.md)
- [User](src/Modules/User/USERS.md)
- [User Access](src/Modules/UserAccess/USER_ACCESS.md)
