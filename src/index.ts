import 'dotenv/config'
import app from './api/app'

const PORT = process.env.PORT || 3000

process.on('SIGINT', () => {
	console.log('\nGracefully shutting down')
	process.exit(0)
})

function main() {
	try {
		app.listen(PORT, () => {
			console.log(`🚀 Server is running on port ${PORT}`)
		})
	} catch (error) {
		console.error('Failed to start:', error)
		process.exit(1)
	}
}

main()
