/**
 * Main Application Entry Point
 */
import './core/engine/ruleEngine';
import './core/engine/actionEngine';
import './core/engine/aiEngine';
import './queue/messageWorker';
import './queue/campaignWorker';
import './services/taskRecorderService';
declare const app: import("express-serve-static-core").Express;
export default app;
//# sourceMappingURL=index.d.ts.map