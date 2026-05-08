import { Router } from "express";
import { createCheckout } from "../controllers/checkoutController.js";

const checkoutRouter = Router();

checkoutRouter.post("/", createCheckout);

export default checkoutRouter;