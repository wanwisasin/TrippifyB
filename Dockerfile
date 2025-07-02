FROM node:18

WORKDIR /app

COPY package*.json ./

# บังคับติดตั้ง devDependencies ด้วย
RUN npm install

COPY . .

EXPOSE 5000

# รัน nodemon ผ่าน npm run dev
CMD ["npm", "run", "dev"]
