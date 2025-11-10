FROM node:20
WORKDIR /app
COPY . .
RUN npm install --omit=dev
CMD ["npm", "start"]
