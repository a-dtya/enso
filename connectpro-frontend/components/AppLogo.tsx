import { Image } from 'react-native';

export default function AppLogo() {
  return (
    <Image
      source={require('../assets/icon.png')}
      style={{ width: 120, height: 120, resizeMode: 'contain' }}
    />
  );
}
