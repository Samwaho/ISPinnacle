"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rlmController_1 = require("../controllers/rlmController");
const router = (0, express_1.Router)();
// RLM REST API endpoints for FreeRADIUS
router.post('/authorize', rlmController_1.rlmController.authorize);
router.post('/authenticate', rlmController_1.rlmController.authenticate);
router.post('/preacct', rlmController_1.rlmController.preAccounting);
router.post('/accounting', rlmController_1.rlmController.accounting);
router.post('/checksimul', rlmController_1.rlmController.checkSimultaneous);
router.post('/postauth', rlmController_1.rlmController.postAuth);
exports.default = router;
//# sourceMappingURL=index.js.map