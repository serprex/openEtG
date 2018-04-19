const React = require('react'),
	store = require('../store'),
	{ connect } = require('react-redux');

module.exports = connect(state => ({ view: state.nav.view || require('./Editor'), props: state.nav.props }))(function App(props) {
	return React.createElement(props.view, props.props);
});
