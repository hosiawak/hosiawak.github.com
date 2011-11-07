require 'rubygems'
require 'mongrel'

port    = ARGV[0] || 80

config = Mongrel::Configurator.new :host => "0.0.0.0", :port => port do
  listener do
    uri "/", :handler => Mongrel::DirHandler.new("./")
  end
  trap("INT") { stop }
  run
end

puts "Mongrel listening on '0.0.0.0:#{port}'."
puts "Press CTRL+C to stop the server"
config.join
