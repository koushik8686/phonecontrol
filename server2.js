import express from "express";
const app = express();
const PORT = 4000;
import cors from "cors";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    console.log("HIT /");
    res.send("hii");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
    console.log(`http://[IP_ADDRESS]`);
});