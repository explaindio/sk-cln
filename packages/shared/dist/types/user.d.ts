export interface User {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatarUrl?: string;
    emailVerified?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export type AuthenticatedUser = Omit<User, 'createdAt' | 'updatedAt'>;
export interface LoginRequest {
    email: string;
    password: string;
}
export interface LoginResponse {
    user: AuthenticatedUser;
    token: string;
}
export interface CreateUserDto {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
}
//# sourceMappingURL=user.d.ts.map