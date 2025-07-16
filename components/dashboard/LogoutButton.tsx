"use client";

import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Button from '../Button';

const LogoutButton = () => {
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    return <Button onClick={handleLogout}>Logout</Button>;
}

export default LogoutButton;
