import { Redirect } from 'expo-router';

/** Unknown links (and the browser preview opened from any path) land on the home screen. */
export default function NotFound() {
  return <Redirect href="/" />;
}
