import { Router, type IRouter } from "express";
import healthRouter from "./health";
import filesRouter from "./files";
import terminalRouter from "./terminal";
import claudeRouter from "./claude";

const router: IRouter = Router();

router.use(healthRouter);
router.use(filesRouter);
router.use(terminalRouter);
router.use(claudeRouter);

export default router;
