import React from 'react';
import { connect } from 'react-redux';
import Editor from './Editor.js';

export default connect(state => ({
	view: state.nav.view || Editor,
	props: state.nav.props,
}))(function App(props) {
	return React.createElement(props.view, props.props);
});
