import React from 'react';
import { connect } from 'react-redux';
import Login from './Login.js';

export default connect(state => ({
	view: state.nav.view || Login,
	props: state.nav.props,
}))(function App(props) {
	return React.createElement(props.view, props.props);
});
