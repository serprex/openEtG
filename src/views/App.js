const React = require('react'),
	{ connect } = require('react-redux');

module.exports = connect(state => ({
	view: state.nav.view || require('./Login'),
	props: state.nav.props,
}))(function App(props) {
	return React.createElement(props.view, props.props);
});
