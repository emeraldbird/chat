const root = ReactDOM.createRoot(document.getElementById('react-root'));

/*
    To do:

    Messages list:
        Edit:
            Replace:
                "id" with "message_id"
            Delete:
                "positions"
            Add:
                "from": <some user id>

        Put it out of App component + change render triggers

    States:
        Replace some states with context to avoid passing too many props to child components.


    Message sending:
        send message -> get message -> add to messages
 */ 

const messages = {
    '-1': [],
}


// Main app
const App = () =>
{
    const [status, setStatus] = React.useState({method: null});
    const [change, setChange] = React.useState(0);
    const ws = React.useRef(null);

    const rerender = () =>
    {
        console.log(change);
        setChange(prev => prev^1);
    }

    const connectChat = (id) =>
    {
        const ws_local = new WebSocket("ws://127.0.0.1:8000/ws/"+id);
    
        ws_local.onerror = (e) =>
        {
            // add error codes handle
            setStatus(status => { return {...status, method: null, error: 'Wrong id, please try again'} });

        }

        ws_local.onclose = () => {
            rerender();
        }

        ws_local.onopen = () => {
            ws.current = ws_local;
            rerender();
        }
    }

    const createChat = () =>
    {
        const ws_local = new WebSocket("ws://127.0.0.1:8000/ws/create-new");
        console.log('ws trying to connect');
        ws_local.onerror = (e) =>
        {
            // add error codes handle
            setStatus({...status, method: null, error: 'Unable to create chat'});
        }

        ws_local.onopen = () => {
            ws.current = ws_local;
            rerender();
        }

        ws_local.onclose = () => {
            rerender();
        }
    }
    

    const setConnect = (id) =>
    {
        // move it to
        if (ws.current){
            ws.current.close();
            ws.current = null;
        }
        setStatus({...status, method: () => connectChat(id)});
    }

    const setCreate = () =>
    {
        if (ws.current){
            ws.current.close();
            ws.current = null;
        }
        setStatus({...status, method: createChat});
    }

    const resetError = () =>
    {
        // clear error without rerender;
        status.error = false;
    }


    if (!status.method || (ws.current && ws.current.readyState==3))
    {
        return (
            <InitialGreeter setConnect={ setConnect }
                            setCreate={ setCreate }
                            error={ status.error }
                            resetError={ resetError }/>
        );
    }

    else if (!ws.current)
    {
        status.method();

        return <Waiting text="Waiting..."/>
    }
    
    else if (ws.current && ws.current.readyState==1)
    {
        return <Messenger ws={ws.current} messages={messages}/>
    }

    return <Waiting text="Something went wrong"/>
}


// Add this instead setMethod way...
const MyEvent = {
    CONNECT_TO_CHAT: "CONNECT_TO_CHAT",
    CREATE_CONNECTION: "CREATE_CONNECTION",
};


// Ask if user wants to join existing chat or create new one
const InitialGreeter = (props) =>
{
    const [chatId, setChatId] = React.useState();

    const handleIdField = (context) =>
    {
        setChatId(context.target.value);
    }

    const handleSubmit = (event) =>
    {
        event.preventDefault();
        props.setConnect(chatId); // props.onUserDecision(MyEvent.CONNECT_TO_CHAT, id)
    }

    const handleButton = (event) =>
    {
        console.log('handle');
        event.preventDefault();
        props.setCreate(); //  props.onUserDecision(MyEvent.CREATE_CONNECTION)
        console.log('we are here');
    }


    const initialForm =
    <div className="row">
      <form className="container col-lg-7 border p-3">
        {props.error?<p className="alert alert-warning">{props.error}</p>:''}
        <div className="input-group">
          <input type="text" onChange={handleIdField} className="form-control" name="meeting-id" placeholder="Chat ID"/>
          <input type="submit" className="btn btn-primary" value="Connect" onClick={handleSubmit}/>
        </div>
        <p className="fs-6 text-center m-2">or</p>
        <button onClick={handleButton} className="btn btn-primary form-control">Create new chat</button>
      </form>
    </div>
    
    setTimeout(() => props.resetError(), 5000);

    return <div className="d-flex flex-column justify-content-around container vh-100">{ initialForm }</div>
}


// Show waiting loader
const Waiting = (props) =>
{
    return <div className="d-flex flex-column justify-content-around container vh-100">
        <p className="display-6 text-center">{ props.text }</p>
    </div>
}


/*---------------------Messenger section-------------------*/

const Message = (props) =>
{
    let outer_div_class = "mb-2 d-flex ";
    outer_div_class += props.message.from == props.my_id ? "justify-content-end": "justify-content-start";

    let inner_div_class = "d-flex ";
    inner_div_class += props.message.from == props.my_id ? "justify-content-end": "justify-content-start";

    return (
        <div className={ outer_div_class }>
            { props.message.from != props.my_id ? <img src="/static/img/ava-icon.jpg"
                                              className="rounded-circle img-fluid float-left m-2"
                                              style={ {width: "40px", height: "40px"} }/> : "" }
                 
            <div className="rounded-3" style={{'backgroundColor': "rgb(231, 245, 255)"}}>
                <div className={ inner_div_class }>
                    <p className="small me-3 mb-0 ps-2 fw-light">{props.message.nickname}</p>
                    <p className="small mb-0 ps-2 fw-light">{ props.message.time }</p>
                </div>
                <div>
                    <p className="small mb-0 p-2">{ props.message.text }</p>
                </div>
            </div>
            { props.message.from != props.my_id ? "" : <img src="/static/img/ava-icon.jpg"
                                                  className="rounded-circle img-fluid float-left m-2"
                                                  style={ {width: "40px", height: "40px"} }/>}
        </div>
    );
}


const Messages = (props) => 
{
    if (!props.messages[props.active_contact_id])
    {
        props.messages[props.active_contact_id] = [];
    }

    return (
        <div className="ovefflow-auto flex-grow-1" style={{"scrollbarWidth": "none"}}>
            {props.messages[props.active_contact_id].map(
                (message) => <Message key={ message.id }
                                      message={ message }
                                      my_id={ props.my_id }
                                      />)}
        </div>
    );
}


const Input = (props) =>
{
    const [value, setValue] = React.useState('');

    return (
        <form onSubmit={ (content) => {content.preventDefault(); props.addMessage(props.active_contact_id, value); setValue(''); } }>
            <div className="input-group input-group-sm mt-3">
                <input type="text"
                       value={ value }
                       onChange={ () => setValue(event.target.value) }
                       className="form-control" required/>
                <button type="submit" className="btn btn-outline-primary btn-lg">Send</button>
            </div>
        </form>
    );
}


const Contacts = (props) =>
{   
    // {props.contacts.map((contact) => <li key={contact["id"]} className="list-group-item">{contact["nickname"]}</li>)}
    return (
        <>
        <div className="list-group list-group-flush">
          <a href="#" className="list-group-item border-bottom" onClick={ ()=>{props.setActiveContactId(-1); props.setCommon({new_message: false});} }>
            { props.common.new_message ? <span className="badge rounded-pill bg-info me-1">@</span>: ''}
            Common</a>
        </div>

        <div className="list-group list-group-flush overflow-auto"
           style={ {"scrollbarWidth": "none"} }>

          { Object.keys(props.contacts).map(id => <Contact key={ id }
                                                          id={ id } contact={ props.contacts[id] }
                                                          active_contact_id={ props.active_contact_id }
                                                          setActiveContactId={ props.setActiveContactId }
                                                          my_id={ props.my_id }
                                                          hasNewMessage={ props.hasNewMessage }
                                                          setMessagesAsRead={ props.setMessagesAsRead }
                                                          />) }
       </div>
       </>
    );
}


const Contact = (props) =>
{
    let cls_str = "list-group-item p-1";
    let value = props.contact.nickname

    if (props.active_contact_id == props.id)
    {
        cls_str += " list-group-item-secondary";
    }

    if (props.id == props.my_id)
    {
        value += " (You)"
    }

    // https://avatarfiles.alphacoders.com/178/thumb-1920-178246.jpg
    return (
        <a onClick={ () => {props.setActiveContactId(props.id); props.setMessagesAsRead(props.id)} }
            key={ props.id }
            className={ cls_str }>

            { props.hasNewMessage(props.id)?<span className="badge rounded-pill bg-info me-1">@</span>:"" }

            <img src="/static/img/ava-icon.jpg"
                 className="rounded-circle img-fluid float-left me-2"
                 style={ {"width": "30px", "height": "30px"} }/>

            { value }
        </a>
    );
}


const Messenger = (props) =>
{
    const [contacts, setContacts] = React.useState({});
    const [common, setCommon] = React.useState({});
    const [messages, setMessages] = React.useState(props.messages);
    const [active_contact_id, setActiveContactId] = React.useState(-1);
    const [my_id, setMyId] = React.useState();
    const [my_name, setMyName] = React.useState();
    const [chat_id, setChatId] = React.useState();

    const ws = React.useRef(0);
    ws.current = props.ws;


    React.useEffect(() =>
        {
            ws.current.onmessage = handleWebsocket;
        }
    );


    const handleWebsocket = (event) =>
    {
        let json_data = JSON.parse(event.data);

        if (json_data.type == "settings")
        {
            setMyId(json_data.id);
            setMyName(json_data.username);
            setChatId(json_data.chat_id);
        }

        if (json_data.type == "contacts")
        {
            const new_contacts = {};

            for (let contact of json_data.contacts)
            {
                new_contacts[contact.id] = {
                    id: contact.id,
                    nickname: contact.username,
                    new_message: false,
                };

                //Object.values(contacts).filter(c => c.new_message == true && new_contacts[c.id]).forEach(c => new_contacts[c.id].new_message = c.new_message);
                //Object.keys(contacts).forEach((i) => {delete contacts[i];});
    
                setContacts({...new_contacts});
            }

        }

        if (json_data.type == "message")
        {
            let from = json_data.from;


            if (!messages[json_data.common ? -1 : from])
            {
                messages[json_data.common ? -1 : from] = [];
            }


            // -1 used as a common
            messages[json_data.common ? -1 : from].push(
                {
                    id: messages[json_data.common ? -1 : from].length + 1,
                    from: from,
                    nickname: json_data.nickname,
                    text: json_data.text,
                    time: json_data.time
                }
            );

            if (json_data.common)
            {
                setCommon({new_message: true});
            }

            else
            {
                markContact(from, contacts);
            }
            
            setMessages({...messages});
        }
    }


    const addMessage = (recipient_id, text) =>
    {
        if (!messages[recipient_id])
        {
            messages[recipient_id] = [];
        }
        
        messages[recipient_id].push(
            {
                id: messages[recipient_id].length + 1,
                from: my_id,
                text: text,
            }
        );

        ws.current.send(
            JSON.stringify(
                {
                    recipient_id: recipient_id,
                    text: text
                }
            )
        );
        
        setMessages({...messages});
    }
    

    const markContact = (id, contacts) =>
    {
        if (contacts[id] && (id != active_contact_id)) {
            contacts[id].new_message = true;
            setContacts({...contacts})
        }
    }


    const hasNewMessage = (id) =>
    {
        if (contacts[id])
            return contacts[id].new_message;
        return false
    }


    const setMessagesAsRead = (id) =>
    {
        if (contacts[id])
        {
            contacts[id].new_message = false;
            setContacts(contacts);
        }
    }


    return (
        //container for messenger app
        <div className="container container-md row vh-100">
            <div className="col col-6 col-sm-5 col-md-4 col-lg-3 d-flex flex-column h-100">
                <p className="small">ID: <span className="small badge bg-secondary">{ chat_id }</span></p>
                <p className="small">Username: { my_name }</p>

                <div id="messages-area" className="row d-flex justify-content-center">
                    <Contacts contacts={ contacts }
                            active_contact_id={ active_contact_id }
                            setActiveContactId={ setActiveContactId }
                            my_id={ my_id }
                            markContact={ markContact }
                            hasNewMessage={ hasNewMessage }
                            setMessagesAsRead={ setMessagesAsRead }
                            setCommon={ setCommon }
                            common={ common }
                            />
                </div>
            </div>

            <div className="col col-6 col-sm-7 col-md-8 col-lg-9 border d-flex flex-column justify-content-between h-100">
                <Messages messages={ messages }
                          contacts={ contacts }
                          active_contact_id={ active_contact_id }
                          my_id={ my_id }/>
                          
                <Input addMessage={ addMessage }
                       active_contact_id={ active_contact_id }/>
            </div>
          
        </div>
    );
}


root.render(<App/>)