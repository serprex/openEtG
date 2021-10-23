import { connect } from 'react-redux';

export default connect(state => ({
	view: state.nav.view,
	props: state.nav.props,
	navkey: state.nav.key,
}))(function App(props) {
	return <props.view key={props.navkey} {...props.props} />;
});
