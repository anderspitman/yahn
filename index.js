//const apiRoot = 'https://hn.algolia.com/api/v1/items/';

class Api {

  constructor() {
    this.apiRoot = 'https://hacker-news.firebaseio.com/v0/item/';
  }

  async fetchItem(id) {
    const url = this.apiRoot + String(id) + '.json';
    console.log(url);
    //const url = this.apiRoot + String(id);
    const res = await fetch(url)

    if (res.status !== 200) {
      return null;
    }

    const item = await res.json();
    return item;
  }

  async getFirstKids(id, cb) {

    const item = await this.fetchItem(id);
    if (item === null) {
      return false;
    }

    cb(item);

    if (!item.kids) {
      return true;
    }

    const firstKidId = item.kids[0];
    const firstKid = await this.fetchItem(firstKidId);
    if (firstKid === null) {
      return false;
    }

    return await this.getFirstKids.bind(this)(firstKidId, cb);
  }

  async walkDepthFirst(id, cb) {
    const item = await this.fetchItem(id);

    if (item === null) {
      return false;
    }

    cb(item);

    if (!item.kids) {
      return true;
    }

    for (const kid of item.kids) {
      const success = await this.walkDepthFirst.bind(this)(kid, cb)
      if (!success) {
        return false;
      }
    }

    return true;
  }
}

(async () => {

  const api = new Api();

  const comments = [];

  const rootEl = document.getElementById('root');
  rootEl.appendChild(Main());
})();


function Main() {
  const dom = document.createElement('div');
  dom.classList.add('main');

  const api = new Api();

  (async () => {
    const item = await api.fetchItem(24872911);
    //const item = await api.fetchItem(24872940);

    item.text = "Root";
    const conversation = Conversation([item]);
    dom.appendChild(conversation.el);

    conversation.el.addEventListener('comment-selected', async (e) => {
      conversation.popComments(e.detail.id);
      const newItem = await api.fetchItem(e.detail.id);
      await setResponseList(newItem);
    });

    let responseList = ResponseList(api, item);

    const responseListContainer = document.createElement('div');
    responseListContainer.classList.add('response-list-container');
    responseListContainer.appendChild(responseList);
    dom.appendChild(responseListContainer);

    responseList.addEventListener('response-selected', handleResponseSelected);

    async function handleResponseSelected(e) {
      conversation.appendComment(e.detail.response);
      await setResponseList(e.detail.response);
    }
    
    async function setResponseList(newItem) {
      const newResponseList = ResponseList(api, newItem);
      responseListContainer.replaceChild(newResponseList, responseList);
      responseList = newResponseList;
      responseList.addEventListener('response-selected', handleResponseSelected);
    }
  })();

  return dom;
}

function Conversation(initialComments) {
  const el = document.createElement('div');
  el.classList.add('conversation');

  let comments = [];
  let els = [];

  const appendComment = (comment) => {
    const textEl = document.createElement('div');
    textEl.classList.add('comment-text');
    textEl.innerText = htmlDecode(comment.text);
    const commentEl = Comment(comment.id, textEl);
    el.appendChild(commentEl);
    comments.push(comment);
    els.push(commentEl);

    console.log("after append", comments, el.childNodes);
  }

  const popComments = (fromId) => {
    console.log("pop", fromId, comments, el.childNodes);
    let startPopping = false;
    let popIndex = -1;
    for (let i = 0; i < comments.length; i++) {
      console.log(i, startPopping);
      if (startPopping) {
        el.removeChild(els[i]);
      }

      if (comments[i].id === fromId) {
        startPopping = true;
        popIndex = i + 1;
      }
    }

    console.log("pin", popIndex);
    comments = comments.slice(0, popIndex);
    els = els.slice(0, popIndex);
    console.log("after pop", comments, el.childNodes);
  }

  for (const comment of initialComments) {
    appendComment(comment);
  }

  return {
    el,
    appendComment,
    popComments,
  };
}

function ResponseList(api, root) {
  const dom = document.createElement('div');
  dom.classList.add('response-list');

  if (!root.kids) {
    return dom;
  }

  const commentCache = {};

  const observeCallback = (entries, observer) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {

        const id = entry.target.dataset.hnId;
        const comment = await api.fetchItem(id);
        commentCache[id] = comment;
        entry.target.innerText = htmlDecode(comment.text);

        observer.unobserve(entry.target);
      }
    });
  };

  const observeOptions = {};

  const observer = new IntersectionObserver(observeCallback, observeOptions);


  for (const kidId of root.kids) {
    const textEl = document.createElement('div');
    textEl.classList.add('comment-text');
    textEl.dataset.hnId = kidId;
    observer.observe(textEl);

    const comment = Comment(kidId, textEl);

    dom.appendChild(comment);
  }

  dom.addEventListener('comment-selected', (e) => {
    e.stopPropagation();
    dom.dispatchEvent(new CustomEvent('response-selected', {
      bubbles: true,
      detail: {
        response: commentCache[e.detail.id],
      },
    }));
  });

  return dom;
}

function Comment(id, textEl) {
  const dom = document.createElement('div');
  dom.classList.add('comment');

  const expandLabel = document.createElement('label');
  expandLabel.classList.add('expand-btn-label');
  //expandLabel.innerText = 'Expand';
  expandLabel.setAttribute('for', 'expand-btn-' + String(id));
  const expandBtn = document.createElement('input');
  expandBtn.classList.add('expand-btn');
  expandBtn.setAttribute('id', 'expand-btn-' + String(id));
  expandBtn.setAttribute('type', 'checkbox');

  dom.appendChild(expandBtn);
  dom.appendChild(textEl);
  dom.appendChild(expandLabel);

  dom.addEventListener('click', (e) => {
    dom.dispatchEvent(new CustomEvent('comment-selected', {
      bubbles: true,
      detail: {
        id,
      },
    }));
  });

  return dom;
}



// taken from https://stackoverflow.com/a/34064434/943814
function htmlDecode(input) {
  var doc = new DOMParser().parseFromString(input, "text/html");
  return doc.documentElement.textContent;
}
