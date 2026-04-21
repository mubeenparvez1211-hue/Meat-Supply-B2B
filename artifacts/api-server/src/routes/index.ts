import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(customersRouter);
router.use(ordersRouter);
router.use(dashboardRouter);

export default router;
