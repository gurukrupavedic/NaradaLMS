declare global {
    namespace Express {
        interface User {
            id: string;
            email: string;
            roles: string[];
            status: string;
        }
    }
}

export {};
