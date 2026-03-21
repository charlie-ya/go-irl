import { useState, useCallback } from 'react';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { db, auth } from './firebase';
import { doc, arrayUnion, updateDoc } from 'firebase/firestore';

export function usePushNotifications() {
    const [isSupported] = useState(Capacitor.isNativePlatform());

    const requestPermissionAndRegister = useCallback(async () => {
        if (!isSupported) {
            console.log('Push notifications not supported on web/dev');
            return false;
        }

        try {
            // 1. Request Permission
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.log('User denied push notification permission');
                return false;
            }

            // 2. Register with Apple / Google to receive token
            await PushNotifications.register();

            // 3. Listen for token
            return new Promise<boolean>((resolve) => {
                PushNotifications.addListener('registration', async (token: Token) => {
                    console.log('Push registration success, token: ' + token.value);
                    const user = auth.currentUser;
                    
                    if (user) {
                        try {
                            const playerRef = doc(db, 'players', user.uid);
                            // Add token to array without duplicates
                            await updateDoc(playerRef, {
                                fcmTokens: arrayUnion(token.value)
                            });
                            console.log('Token saved to Firestore');
                            resolve(true);
                        } catch (e) {
                            console.error('Failed to save FCM token to Firestore', e);
                            resolve(false);
                        }
                    } else {
                        resolve(false);
                    }
                });

                PushNotifications.addListener('registrationError', (error: any) => {
                    console.error('Error on registration: ' + JSON.stringify(error));
                    resolve(false);
                });
            });
        } catch (error) {
            console.error('Error during push notification setup:', error);
            return false;
        }
    }, [isSupported]);

    return {
        isSupported,
        requestPermissionAndRegister
    };
}
