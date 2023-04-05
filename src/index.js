// Regular expression to match template variables
const TEMPLATE_VAR_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

async function fetchData () {
    const url = 'https://people.canonical.com/~anthonydillon/wp-json/wp/v2/posts.json'
    try {
        const resp = await fetch(url)
        return await resp.json()
    }
    catch (e) {
        return []
    }
}

function* prepData (articles) {
    for (const { link, date: dateString, featured_media, topic, categories: cats, _embedded: {["wp:term"]: term }, title: { rendered: title }, _embedded: {author: [authorInfo] } } of articles) {
        // Convert the date string to a Date object and format it
        const dateObj = new Date(dateString)
        const month = dateObj.toLocaleString("default", { month: "long" })
        const date = `${dateObj.getDate()} ${month} ${dateObj.getFullYear()}`

        // Build objects with topic and category IDs as keys and names as values
        const definedTopics = Object.fromEntries(
            term.flatMap(item => item)
                .filter(({taxonomy}) => taxonomy == 'topic')
                .map(({id, name}) => ([id, name]))
        )
        const definedCategories = Object.fromEntries(
            term.flatMap(item => item)
                .filter(({taxonomy}) => taxonomy == 'category')
                .map(({ id, name }) => ([id, name]))
        )

        // Map topic and category IDs to their names and join them into a string
        const topicsArray = topic.map(topicID => definedTopics[topicID]).filter(Boolean)
        const categoriesArray = cats.map(topicID => definedCategories[topicID]).filter(Boolean)
        const topics = topicsArray.join(', ') || '&nbsp;'
        const categories = categoriesArray.join(', ') || '&nbsp;'
        
        yield {
            link,
            featured_media,
            title,
            authorName: authorInfo.slug,
            authorLink: authorInfo.link,
            date,
            topics,
            categories,
        }
    }
}

// Render an HTML template with a given context
function renderTemplate(template, context) {
    const html = template.replace(TEMPLATE_VAR_REGEX, (_, key) => context[key] || "")
    const envelope = document.createElement("div")
    envelope.innerHTML = html.trim()
    return envelope.firstChild
}

document.addEventListener("DOMContentLoaded", async () => {
    const articlesRaw = await fetchData()

    // Generate an iterator of context objects for the fetched articles
    const articlesContext = prepData(articlesRaw)

    // Find the container element and template element in the DOM
    const container = document.querySelector(".row")
    const templateEl = document.querySelector("template")

    // Render the template for each context object and append it to the container
    for (const articleCtx of articlesContext) {
        const templateClone = templateEl.content.firstElementChild.cloneNode(true)
        const cardNode = renderTemplate(templateClone.innerHTML, articleCtx)
        container.appendChild(cardNode)
    }
})