"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoModerationService = void 0;
const prisma_1 = require("../../../apps/api/src/lib/prisma");
class AutoModerationService {
    constructor() {
        this.prismaClient = prisma_1.prisma;
    }
    // Basic method to prevent compilation error
    async moderateContent(content) {
        // Placeholder implementation
        return true;
    }
}
exports.AutoModerationService = AutoModerationService;
//# sourceMappingURL=autoModeration.js.map