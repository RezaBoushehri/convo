# CONVO
[![](https://img.shields.io/static/v1?message=Back-end&label=NodeJS&logo=javascript&color=orange&style=for-the-badge)](https://nodejs.org/en/)
[![](https://img.shields.io/static/v1?message=Database&label=MongoDB&logo=mongodb&color=blue&style=for-the-badge)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/github/license/SparshJain2000/convo?style=for-the-badge&color=green&logo=github)](https://opensource.org/licenses/MIT)


A chat application using web sockets and NodeJS 
## Technologies Used -

###### Back-end : Node JS, Express JS, Socket.io

###### Database : Mongo DB (Mongoose)

###### Authentication : Passport JS

###### Front-end : HTML, EJS, CSS, JS, Bootstrap

## Installation :

#### Install Nodejs and Mongo.

#### Clone the repository

```bash
git clone https://github.com/SparshJain2000/convo.git
```

#### Install dev and production dependencies

```bash
npm install
```

#### Declare environment variables

###### Create a file .env

```txt
MONGO_URI = 'Your mongo url'
SECRET = 'secret for Passport'
```

#### Start the server (run app.js file)

```bash
nodemon app
```
## License

**MIT &copy; [Sparsh Jain](https://github.com/SparshJain2000/convo/blob/master/LICENSE)**

## Support
Give a 🌟 to this repo if you liked it.

Connect with me

[![Instagram](https://img.shields.io/static/v1.svg?label=follow&message=@sparsh._jain&color=grey&logo=instagram&style=for-the-badge&logoColor=white&colorA=critical)](https://www.instagram.com/sparsh._jain/) [![LinkedIn](https://img.shields.io/static/v1.svg?label=connect&message=@SparshJain&color=success&logo=linkedin&style=for-the-badge&logoColor=white&colorA=blue)](https://www.linkedin.com/in/sparsh-jain-87379a168/) [![Github](https://img.shields.io/static/v1.svg?label=follow&message=@SparshJain2000&color=grey&logo=github&style=for-the-badge&logoColor=white&colorA=black)](https://www.github.com/SparshJain2000/)


npm install dotenv --save-dev
npm install -g pm2
pm2 start app.js
pm2 start app.js --watch
pm2 list
pm2 logs
pm2 save
pm2 startup
pm2 stop app.js


{
    "name": "X",
    "host": "172.16.28.29",
    "protocol": "sftp",
    "port": 22022,
    "secure": true,
    "username": "root",
    "password": "Farah00sh@.ir",
    "remotePath": "/usr/Projects/Reza/metaChat/",
    "uploadOnSave": true
}