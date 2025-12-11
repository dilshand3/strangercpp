import { Alert, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export const reqCameraAudio = async () => {
    try {
        if (Platform.OS === 'android') {
            const cameraStatus = await check(PERMISSIONS.ANDROID.CAMERA);
            if (cameraStatus === RESULTS.DENIED || cameraStatus === RESULTS.BLOCKED) {
                const requestCamera = await request(PERMISSIONS.ANDROID.CAMERA);
                if (requestCamera !== RESULTS.GRANTED) {
                    Alert.alert("Camera permission denied");
                    return false;
                }
            }

            const micStatus = await check(PERMISSIONS.ANDROID.RECORD_AUDIO);
            if (micStatus === RESULTS.DENIED || micStatus === RESULTS.BLOCKED) {
                const requestMic = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
                if (requestMic !== RESULTS.GRANTED) {
                    Alert.alert('Microphone permission denied');
                    return false;
                }
            }

            return true;
        } else {
            return true;
        }
    } catch (error) {
        console.error('Permission Error:', error);
        return false;
    }
};