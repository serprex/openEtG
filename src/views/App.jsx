import { useSelector } from 'react-redux';

export default function App(props) {
	const nav = useSelector(({ nav }) => nav);
	return <nav.view key={nav.key} {...nav.props} />;
}