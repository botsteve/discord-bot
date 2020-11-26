async function getMessage(request, sessionId, assistantId, assistant) {
	try {
		const param = {
			input: { text: request },
			assistantId: assistantId,
			sessionId: sessionId,
		};

		const response = await assistant.message(param);

		console.log('successful call');
		console.log('text0: ' + JSON.stringify(response.result, null, 2));
		return JSON.stringify(response.result.output.generic[0].text, null, 2);
	}
	catch (err) {
		console.log('unsuccessful call');
		console.log(err);
		return err.stringify;
	}
}

const callAssistant = async function callAssistant(request, assistant, assistantId) {
	try {
		const sessionId = (
			await assistant.createSession({ assistantId: assistantId })
		).result.session_id;
		const responseText = await getMessage(request, sessionId, assistantId, assistant);
		return responseText;
	}
	catch (error) {
		console.error(error);
	}
};

module.exports = callAssistant ;