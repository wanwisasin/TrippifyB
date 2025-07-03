const app = require('./src/app');

const PORT = process.env.BACKEND_PORT|| 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
