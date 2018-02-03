const React = require('react'),
	store = require('../store'),
	{ connect } = require('react-redux');

module.exports = connect(state => ({ view: state.nav.view || require('./Login'), viewProps: state.nav.props }))(function App(props) {
	return React.createElement(props.view, Object.assign({
		doNav: (view, viewProps) => props.dispatch(store.doNav(view, viewProps))
	}, props.viewProps));
});
